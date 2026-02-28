# Rollback Plan (auto) — Summa Social

Generat: 2026-02-28 19:36
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 2e5ef88
SHA main a publicar: b673c83

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert b673c83 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 2e5ef88
git push origin prod --force-with-lease
```
