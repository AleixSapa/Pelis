## Revisió abans de publicar
- Cerca: el formulari ja no és interceptat pels scripts antics; `discover-v2.js` usa `/search` per obtenir coincidències parcials i `/justwatch` per combinar disponibilitat.
- Exemple esperat: `Princes` -> títols que contenen `princes`.
- Pòsters: s'extreuen URLs d'imatge i IMDb ID; si una imatge falla, hi ha dos fallbacks abans del placeholder.
- Dades: els canvis només afecten frontend/cercador. No hi ha cap DELETE de pel·lícules, cap DROP/CREATE de taules ni cap modificació de dades existents.
- Scripts antics que causaven conflictes eliminats del carregament i del repositori.
- `discover-v2.js` validat amb `node --check`.
