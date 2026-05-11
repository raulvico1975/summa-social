# Rollback Plan (auto) — Summa Social

Generat: 2026-05-11 21:51
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: f823c36d9
SHA branca a publicar (main): f77da6bee

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert f77da6bee --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard f823c36d9
git push origin prod --force-with-lease
```
