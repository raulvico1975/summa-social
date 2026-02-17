# Rollback Plan (auto) — Summa Social

Generat: 2026-02-17 19:19
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 8f2d31f
SHA main a publicar: 18b82d0

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 18b82d0 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 8f2d31f
git push origin prod --force-with-lease
```
