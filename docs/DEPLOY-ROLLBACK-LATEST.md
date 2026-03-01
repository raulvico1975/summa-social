# Rollback Plan (auto) — Summa Social

Generat: 2026-03-01 11:04
Risc: BAIX
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 64e0f58
SHA main a publicar: b97fc98

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert b97fc98 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 64e0f58
git push origin prod --force-with-lease
```
