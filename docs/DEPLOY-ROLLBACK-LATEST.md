# Rollback Plan (auto) — Summa Social

Generat: 2026-03-23 08:25
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 17649d89
SHA main a publicar: 6f39621d

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 6f39621d --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 17649d89
git push origin prod --force-with-lease
```
