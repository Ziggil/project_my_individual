from datetime import timedelta
from online_users.models import OnlineUserActivity

def online_users_processor(request):
    # Работаем только на страницах админки, чтобы не нагружать остальной сайт
    if request.path.startswith('/admin/'):
        try:
            activities = OnlineUserActivity.get_user_activities(timedelta(minutes=5))
            return {
                'online_users': activities,
            }
        except Exception:
            return {'online_users': []}
    return {}