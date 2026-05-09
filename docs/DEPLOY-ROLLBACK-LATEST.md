# Rollback Plan (auto) — Summa Social

Generat: 2026-05-09 10:34
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: e34e6978b
SHA branca a publicar (main): 572c8f1ab

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 572c8f1ab --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard e34e6978b
git push origin prod --force-with-lease
```
