# Rollback Plan (auto) — Summa Social

Generat: 2026-02-15 17:28
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 216c355
SHA main a publicar: 1f7ac85

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 1f7ac85 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 216c355
git push origin prod --force-with-lease
```
