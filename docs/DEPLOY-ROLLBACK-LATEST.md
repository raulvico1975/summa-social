# Rollback Plan (auto) — Summa Social

Generat: 2026-06-17 19:49
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 7d9c9cc6a
SHA branca a publicar (main): 7a7f9f27e

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 7a7f9f27e --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 7d9c9cc6a
git push origin prod --force-with-lease
```
