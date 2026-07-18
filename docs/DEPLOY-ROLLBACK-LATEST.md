# Rollback Plan (auto) — Summa Social

Generat: 2026-07-18 20:45
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 834d9d8ae
SHA branca a publicar (main): 3b6e95e0f

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 3b6e95e0f --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 834d9d8ae
git push origin prod --force-with-lease
```
