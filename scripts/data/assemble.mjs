/**
 * From normalised records to merged venues: cluster duplicates, merge each cluster,
 * and apply web-research closures. Pure (no I/O) so the rules are unit-testable on fixtures.
 */
import { mergeCluster } from "./merge-records.mjs";
import { approxMatch, clusterRecords } from "./merge-rules.mjs";

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * @param {object[]} records OSM, Overture and web records that survived the deny-list
 * @param {{ forcedPairs?: Iterable<string>, ghosts?: object[], tombstones?: object[] }} [options]
 *   ghosts: removed records that still take part in the proximity-review scan
 *   tombstones: removed records a web-only find must not resurrect
 */
export function assemble(records, { forcedPairs = [], ghosts = [], tombstones = [] } = {}) {
  const { clusters, review, merges } = clusterRecords([...records].sort(byId), { forcedPairs, ghosts });
  const venues = [];
  const researchClosed = [];
  const researchBlocked = [];
  for (const members of clusters) {
    const closedBy = members.filter((member) => member.web?.closed);
    if (closedBy.length) {
      const removed = members.filter((member) => !member.web);
      if (removed.length) {
        researchClosed.push({
          ids: removed.map((member) => member.id),
          names: removed.map((member) => member.name),
          closedBy: closedBy.map((member) => ({ id: member.id, evidence: member.web.evidence })),
        });
      }
      continue;
    }
    if (members.every((member) => member.web)) {
      const blocker = tombstones.find((tomb) => members.some((member) => approxMatch(member, tomb).merge));
      if (blocker) {
        researchBlocked.push({ id: members[0].id, name: members[0].name, matched: blocker.id, removedBy: blocker.removedBy ?? "removed" });
        continue;
      }
    }
    venues.push(mergeCluster(members));
  }
  return { venues, review, merges, researchClosed, researchBlocked };
}
