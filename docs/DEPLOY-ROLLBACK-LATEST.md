# Rollback Plan (auto) — Summa Social

Generat: 2026-02-17 15:54
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: bc0b6ab
SHA main a publicar: 4189bf9

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 4189bf9 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard bc0b6ab
git push origin prod --force-with-lease
```
