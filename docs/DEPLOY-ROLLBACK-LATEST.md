# Rollback Plan (auto) — Summa Social

Generat: 2026-05-12 11:23
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 5f2e7273f
SHA branca a publicar (main): 4e8b9b2a3

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 4e8b9b2a3 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 5f2e7273f
git push origin prod --force-with-lease
```
