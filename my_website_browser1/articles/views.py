from django.shortcuts import render

# Create your views here.
from django.shortcuts import render,redirect
from .models import Articles
from .forms import ArticlesFrom
from django.views.generic import DetailView,UpdateView,DeleteView
#Сущуствует множество предустановленных классов помимо DetailView

from django.contrib.auth.decorators import login_required


#из-за того что все папки templates(шаблоны) объединяются в одну общую папку,мы можем обратиться здесь к html шаблону из main
#Из другого приложения.
#То есть, к примеру 'main/index.html'-значит что я сейчас буду отображать такой html шаблон который находиться в папке main
@login_required

#страница со всеми статьями
def articles_home(request):
    #Порядок сортировки(без сортировки просто news=Articles.objects.all()-тоесть мы просто выводим все записи)
    #А тут сортируем либо по title от большего к меньшему -названию либо по дате date от строго к новогоу(в обратном порядке '-title' или '-date'
    #Если хотим получить какото опрделнное кол-во записей то после скобок срез: [:1]
    articles=Articles.objects.order_by('-date')
    return render(request,'articles/articles_home.html',{'articles':articles})

#переходит на конкретную статью
class ArticlesDetailView(DetailView):
    model=Articles
    template_name='articles/details_view.html'
    #Это как бы ключ по которому мы передаем определенный объект внутрь шаблонаю
    context_object_name = 'article'

#отображение страницы обновления статьи
class ArticlesUpdateView(UpdateView):
    model=Articles
    template_name = "articles/create.html"

    form_class=ArticlesFrom

#страница удаления статьи
class ArticlesDeleteView(DeleteView):
    model=Articles
    #В этом поле указываем куда нужно будет переодресовывать пользователя после того как выполниться удаление статьи
    success_url='/articles/'
    template_name = "articles/articles-delete.html"

#редактированеи статьи
@login_required
def create(request):
    error=''
    if request.method=="POST":
        form =ArticlesFrom(request.POST)
        #is_valid-метод который позволяет проверить являются ли данные корректно заполненными
        if form.is_valid():
            form.save()
            #Совершаем переодресацию на страницу home
            return redirect('home')
        else:
            error="Форма была неверной"

    form=ArticlesFrom()

    data={
        'form':form,
        'error':error
    }

    return render(request,"articles/create.html",data)



from .models import Articles, ArticleReadProgress

from django.http import JsonResponse
from django.shortcuts import get_object_or_404

# функция для помтки прочитал пользователь статью или нет
def mark_article_read(request, pk):
    """API для отметки статьи как прочитанной (вызывается из JS)"""
    if request.method == 'POST' and request.user.is_authenticated:
        article = get_object_or_404(Articles, pk=pk)
        
        # Создаем запись, если ее еще нет
        obj, created = ArticleReadProgress.objects.get_or_create(
            user=request.user,
            article=article
        )
        
        if created:
            return JsonResponse({'status': 'ok', 'message': 'Статья отмечена как прочитанная'})
        else:
            return JsonResponse({'status': 'ok', 'message': 'Уже прочитано'})
            
    return JsonResponse({'status': 'error', 'message': 'Не авторизован или не POST'}, status=400)