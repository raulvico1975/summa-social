# Rollback Plan (auto) — Summa Social

Generat: 2026-04-04 12:04
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 00b51fe6
SHA branca a publicar (main): ffc92be0

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert ffc92be0 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 00b51fe6
git push origin prod --force-with-lease
```
