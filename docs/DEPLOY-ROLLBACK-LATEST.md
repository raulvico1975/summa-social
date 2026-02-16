# Rollback Plan (auto) — Summa Social

Generat: 2026-02-16 12:11
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 27d803e
SHA main a publicar: ab3a089

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert ab3a089 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 27d803e
git push origin prod --force-with-lease
```
