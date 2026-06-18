# Rollback Plan (auto) — Summa Social

Generat: 2026-06-18 16:50
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: 2bda46cae
SHA branca a publicar (main): 2e2d657f9

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 2e2d657f9 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 2bda46cae
git push origin prod --force-with-lease
```
