# Rollback Plan (auto) — Summa Social

Generat: 2026-06-09 08:13
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: ac060c96f
SHA branca a publicar (main): e5839b2ad

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert e5839b2ad --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard ac060c96f
git push origin prod --force-with-lease
```
