# Rollback Plan (auto) — Summa Social

Generat: 2026-04-04 10:03
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: c88a597f
SHA branca a publicar (main): 62a00b1b

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 62a00b1b --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard c88a597f
git push origin prod --force-with-lease
```
