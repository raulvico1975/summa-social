# Rollback Plan (auto) — Summa Social

Generat: 2026-06-03 09:58
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 24b67c40c
SHA branca a publicar (main): d86eb2082

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert d86eb2082 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 24b67c40c
git push origin prod --force-with-lease
```
