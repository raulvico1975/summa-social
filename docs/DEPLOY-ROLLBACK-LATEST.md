# Rollback Plan (auto) — Summa Social

Generat: 2026-02-28 17:53
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 1de2925
SHA main a publicar: f903b97

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert f903b97 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 1de2925
git push origin prod --force-with-lease
```
