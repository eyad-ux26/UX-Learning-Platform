cd /c/Users/eyadm/uxgate-web/heu
r(){ ../.venv/Scripts/python.exe clipcut.py "$@" < /dev/null || echo "FAIL $1"; }
ZOOM=1.45 r P02-C01 "heu 1" 606.9 698.2 1180:740:665:30
r P02-C02 "heu 2" 160.4 276.2
r P02-C03 "heu 3" 90.0 196.8
r P02-C04 "heu 4" 992.3 1105.3
r P02-C05 "heu 5" 351.9 471.3
ZOOM=1.9 r P02-C06 "heu 6" 224.5 369.5
ZOOM=1.9 r P02-C07 "heu 7" 56.4 175.6
r P02-C08 "heu 8" 194.9 340.3
r P02-C09 "heu 9" 1084.4 1199.1
r P02-C10 "heu 10" 919.8 1095.3
