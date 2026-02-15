# TOMs — Mesures Tècniques i Organitzatives

**Versió**: 1.0  
**Última actualització**: 15 Febrer 2026

## Mesures tècniques

- Xifratge en trànsit mitjançant HTTPS/TLS.
- Xifratge en repòs sobre la infraestructura de Google Cloud/Firebase.
- Control d'accés per rols i separació de permisos.
- Aïllament de dades per organització (model multi-tenant amb regles d'accés).
- Registre d'esdeveniments tècnics i incidències operatives.

## Mesures organitzatives

- Principi de mínim privilegi per accés administratiu.
- Procediments de desplegament, rollback i verificació documentats a `docs/GOVERN-DE-CODI-I-DEPLOY.md`.
- Política de gestió d'incidències i traçabilitat a `docs/DEPLOY-INCIDENTS.md`.
- Procediments de sortida i exportació de dades a `docs/trust/Data-Exit-Plan.md`.

## Revisió

- Revisió periòdica com a mínim anual o quan hi hagi canvis rellevants d'arquitectura.
