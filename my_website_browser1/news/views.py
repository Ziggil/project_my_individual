from django.shortcuts import render

# Create your views here.
from django.shortcuts import render,redirect
from .models import Articles
from .forms import ArticlesFrom
from django.views.generic import DetailView,UpdateView,DeleteView
#Сущуствует множество предустановленных классов помимо DetailView




#из-за того что все папки templates(шаблоны) объединяются в одну общую папку,мы можем обратиться здесь к html шаблону из main
#Из другого приложения.
#То есть, к примеру 'main/index.html'-значит что я сейчас буду отображать такой html шаблон который находиться в папке main
def news_home(request):
    #Порядок сортировки(без сортировки просто news=Articles.objects.all()-тоесть мы просто выводим все записи)
    #А тут сортируем либо по title от большего к меньшему -названию либо по дате date от строго к новогоу(в обратном порядке '-title' или '-date'
    #Если хотим получить какото опрделнное кол-во записей то после скобок срез: [:1]
    news=Articles.objects.order_by('-date')
    return render(request,'news/news_home.html',{'news':news})

class NewsDetailView(DetailView):
    model=Articles
    template_name='news/details_view.html'
    #Это как бы ключ по которому мы передаем определенный объект внутрь шаблонаю
    context_object_name = 'article'


class NewsUpdateView(UpdateView):
    model=Articles
    template_name = "news/create.html"

    form_class=ArticlesFrom


class NewsDeleteView(DeleteView):
    model=Articles
    #В этом поле указываем куда нужно будет переодресовывать пользователя после того как выполниться удаление статьи
    success_url='/news/'
    template_name = "news/news-delete.html"


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

    return render(request,"news:create.html",data)