# Rollback Plan (auto) — Summa Social

Generat: 2026-02-26 09:31
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: e49cc44
SHA main a publicar: 546c05d

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 546c05d --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard e49cc44
git push origin prod --force-with-lease
```
