# Rollback Plan (auto) — Summa Social

Generat: 2026-03-20 19:40
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: ca81689d
SHA main a publicar: 9b9d1780

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 9b9d1780 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard ca81689d
git push origin prod --force-with-lease
```
