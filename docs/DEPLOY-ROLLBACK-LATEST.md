# Rollback Plan (auto) — Summa Social

Generat: 2026-07-10 00:16
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 35f287020
SHA branca a publicar (main): 53bda162f

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 53bda162f --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 35f287020
git push origin prod --force-with-lease
```
