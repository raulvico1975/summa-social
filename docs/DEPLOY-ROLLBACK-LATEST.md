# Rollback Plan (auto) — Summa Social

Generat: 2026-02-28 19:42
Risc: BAIX
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 1a0ff70
SHA main a publicar: 6b03e91

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 6b03e91 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 1a0ff70
git push origin prod --force-with-lease
```
