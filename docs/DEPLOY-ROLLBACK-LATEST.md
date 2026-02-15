# Rollback Plan (auto) — Summa Social

Generat: 2026-02-15 23:27
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 662a85c
SHA main a publicar: 7dcaf25

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 7dcaf25 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 662a85c
git push origin prod --force-with-lease
```
