# Rollback Plan (auto) — Summa Social

Generat: 2026-05-11 20:24
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 08165c4b1
SHA branca a publicar (main): f02c97090

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert f02c97090 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 08165c4b1
git push origin prod --force-with-lease
```
