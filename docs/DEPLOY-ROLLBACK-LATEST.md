# Rollback Plan (auto) — Summa Social

Generat: 2026-03-24 13:00
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: f8ad6c5b
SHA branca a publicar (main): ed0f652b

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert ed0f652b --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard f8ad6c5b
git push origin prod --force-with-lease
```
