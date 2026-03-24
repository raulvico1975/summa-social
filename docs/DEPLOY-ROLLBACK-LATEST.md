# Rollback Plan (auto) — Summa Social

Generat: 2026-03-24 16:14
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: fc134e91
SHA branca a publicar (main): 05f42abe

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 05f42abe --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard fc134e91
git push origin prod --force-with-lease
```
