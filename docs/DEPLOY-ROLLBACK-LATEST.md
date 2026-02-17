# Rollback Plan (auto) — Summa Social

Generat: 2026-02-17 22:06
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 85892a1
SHA main a publicar: 07ad1d6

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 07ad1d6 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 85892a1
git push origin prod --force-with-lease
```
