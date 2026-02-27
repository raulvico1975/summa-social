# Rollback Plan (auto) — Summa Social

Generat: 2026-02-27 16:26
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: c6372b7
SHA main a publicar: 17dfe76

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 17dfe76 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard c6372b7
git push origin prod --force-with-lease
```
