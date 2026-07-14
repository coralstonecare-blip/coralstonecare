function normalizedWords(value) {
  return new Set(String(value).toLowerCase().match(/[a-z0-9]+/g) || []);
}

export function classifyKeyword(keyword, clusters) {
  const words = normalizedWords(keyword);
  let winner = null;
  let best = 0;
  for (const cluster of clusters) {
    const candidates = [cluster.label, ...cluster.terms];
    let score = 0;
    for (const term of candidates) {
      const termWords = normalizedWords(term);
      const overlap = [...termWords].filter((word) => words.has(word)).length;
      score = Math.max(score, overlap / Math.max(termWords.size, 1));
    }
    if (score > best) {
      best = score;
      winner = cluster.id;
    }
  }
  return best >= 0.34 ? winner : null;
}

export function violatesRotation(clusterId, history, maximum = 3) {
  if (history.length < maximum) return false;
  return history.slice(-maximum).every((id) => id === clusterId);
}

export function selectOpportunity({ candidates, clusters, state, forbiddenIntents = [], maximum = 3 }) {
  const used = new Set([...(state.published || []), ...(state.drafts || [])].map((item) => item.keyword.toLowerCase()));
  const forbidden = forbiddenIntents.map((item) => item.toLowerCase());
  const prepared = candidates
    .filter((item) => item?.keyword && !used.has(item.keyword.toLowerCase()))
    .filter((item) => !forbidden.some((phrase) => item.keyword.toLowerCase().includes(phrase)))
    .map((item) => ({
      ...item,
      cluster: item.cluster || classifyKeyword(item.keyword, clusters)
    }))
    .filter((item) => item.cluster && clusters.some((cluster) => cluster.id === item.cluster))
    .filter((item) => !violatesRotation(item.cluster, state.clusterHistory || [], maximum));

  prepared.sort((a, b) => {
    if ((b.impressions || 0) !== (a.impressions || 0)) return (b.impressions || 0) - (a.impressions || 0);
    return (a.position || 99) - (b.position || 99);
  });
  return prepared[0] || null;
}
