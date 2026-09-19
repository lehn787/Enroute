import re

with open('e:/code/enroute/js/admin.js', 'r', encoding='utf-8') as f:
    content = f.read()

methods_to_await = ['addBus', 'updateBus', 'deleteBus', 'addStop', 'updateStop', 'deleteStop', 'deleteMultipleStops', 'addRoute', 'addRouteStops', 'updateRouteStops', 'addTrip', 'addStopTimes', 'resetTripsForRoute', 'updateStopTime']

for method in methods_to_await:
    content = re.sub(r'(?<!await\s)store\.' + method + r'\(', r'await store.' + method + '(', content)

content = content.replace('store.getBuses()', 'store.getAdminBuses()')
content = content.replace('store.getRoutes()', 'store.getAdminRoutes()')
content = content.replace('store.getTrips()', 'store.getAdminTrips()')

content = content.replace("this.authContainer.classList.add('hidden');", "await store.initializeData();\n        this.authContainer.classList.add('hidden');", 1)

content = re.sub(r"addEventListener\('submit',\s*\((.*?)\)\s*=>\s*\{", r"addEventListener('submit', async (\1) => {", content)
content = re.sub(r"addEventListener\('submit',\s*e\s*=>\s*\{", r"addEventListener('submit', async (e) => {", content)

for method in ['executeDeleteBus', 'executeDeleteStop', 'executeDeleteMultipleStops', 'executeDeleteRoute']:
    content = content.replace(f'    {method}() {{', f'    async {method}() {{')

with open('e:/code/enroute/js/admin.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
