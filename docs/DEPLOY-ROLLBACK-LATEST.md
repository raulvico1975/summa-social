# Rollback Plan (auto) — Summa Social

Generat: 2026-05-09 11:40
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: e3049cdca
SHA branca a publicar (main): fe9f35c55

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert fe9f35c55 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard e3049cdca
git push origin prod --force-with-lease
```
