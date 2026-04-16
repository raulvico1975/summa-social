# Rollback Plan (auto) — Summa Social

Generat: 2026-04-16 16:49
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 7a9165f6a
SHA branca a publicar (main): a1239adda

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert a1239adda --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 7a9165f6a
git push origin prod --force-with-lease
```
