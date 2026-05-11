# Rollback Plan (auto) — Summa Social

Generat: 2026-05-11 20:35
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 08165c4b1
SHA branca a publicar (main): 21addcb48

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 21addcb48 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 08165c4b1
git push origin prod --force-with-lease
```
