from django.db import models

# Create your models here.

DIF_CHOICES=(
    ('легкий', 'легкий'),
    ('средний', 'среданий'),
    ('сложный', 'сложный'),
)

class Quiz(models.Model):
    name=models.CharField(max_length=120)
    topic=models.CharField(max_length=120)
    number_of_questions=models.IntegerField()
    time=models.IntegerField(help_text="продолжительность этого сеанаса вминутах")
    required_score_pass=models.IntegerField(help_text="бал в процентах %")
    difficluty=models.CharField(max_length=6, choices=DIF_CHOICES)

    def __str__(self):
        return f"{self.name}-{self.topic}"
    
    def get_questions(self):
        return self.question_set.all()