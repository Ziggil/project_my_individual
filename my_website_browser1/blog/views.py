from django.http import HttpResponse
from django.shortcuts import render

# Create your views here.
def blog(request):
    return render(request, 'blog/blog.html')

def blog_one(request):
    return render(request, 'blog/blog_one.html')







