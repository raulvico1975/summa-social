# Rollback Plan (auto) — Summa Social

Generat: 2026-03-03 11:51
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 84b9323
SHA main a publicar: 332ca4d

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 332ca4d --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 84b9323
git push origin prod --force-with-lease
```
