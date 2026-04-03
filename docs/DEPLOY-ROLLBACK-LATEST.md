# Rollback Plan (auto) — Summa Social

Generat: 2026-04-03 19:22
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 0fb9399f
SHA branca a publicar (main): 43eb8076

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 43eb8076 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 0fb9399f
git push origin prod --force-with-lease
```
