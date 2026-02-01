from django.http import HttpResponse
from django.shortcuts import render

# Create your views here.
def blog(request):
    return render(request, 'blog/blog.html')

def blog_one(request):
    return render(request, 'blog/blog_one.html')

def blog_two(request):
    return render(request, 'blog/blog_two.html')

def blog_three(request):
    return render(request, 'blog/blog_three.html')


def blog_four(request):
    return render(request, 'blog/blog_four.html')
