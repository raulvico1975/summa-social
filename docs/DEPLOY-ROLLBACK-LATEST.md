# Rollback Plan (auto) — Summa Social

Generat: 2026-03-03 11:30
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 7cb6018
SHA main a publicar: 549c9ca

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 549c9ca --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 7cb6018
git push origin prod --force-with-lease
```
