# Rollback Plan (auto) — Summa Social

Generat: 2026-03-01 22:03
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: d4b62aa
SHA main a publicar: 12441be

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 12441be --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard d4b62aa
git push origin prod --force-with-lease
```
