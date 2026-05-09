# Rollback Plan (auto) — Summa Social

Generat: 2026-05-09 12:52
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 7638d5c63
SHA branca a publicar (main): 1a214161a

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 1a214161a --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 7638d5c63
git push origin prod --force-with-lease
```
