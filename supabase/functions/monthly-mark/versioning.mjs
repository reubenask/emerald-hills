// Old pages do not send a revision. Keep them on the original catalogue.
export function resolveCatalogRevision(current, requested) {
  const version = requested === '__legacy__'
    ? current._legacyVersion || current.version
    : requested || current.version;
  if (version === current.version) return current;
  const archived = Object.prototype.hasOwnProperty.call(current._history || {}, version)
    ? current._history[version] : null;
  return archived?.version === version ? archived : null;
}

export function responseMatchesRevision(catalog, response) {
  return !response?.examRevision || response.examRevision === catalog.version;
}
