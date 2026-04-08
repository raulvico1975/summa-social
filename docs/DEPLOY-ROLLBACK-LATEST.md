# Rollback Plan (auto) — Summa Social

Generat: 2026-04-08 10:31
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: e6dd43e1
SHA branca a publicar (main): 5419363b

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 5419363b --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard e6dd43e1
git push origin prod --force-with-lease
```
