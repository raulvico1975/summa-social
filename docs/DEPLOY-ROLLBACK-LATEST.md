# Rollback Plan (auto) — Summa Social

Generat: 2026-03-01 20:00
Risc: BAIX
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 9f50761
SHA main a publicar: ffaad53

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert ffaad53 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 9f50761
git push origin prod --force-with-lease
```
