# Rollback Plan (auto) — Summa Social

Generat: 2026-06-10 09:33
Risc: BAIX
Backup curt: NO_REQUIRED
SHA prod abans de publicar: bf46e7f63
SHA branca a publicar (main): e0940f180

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert e0940f180 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard bf46e7f63
git push origin prod --force-with-lease
```
