//
//  PatientRegistrationController.m
//  ANA Health Assistant
//
//  Created by Amit Rao on 2/25/17.
//  Copyright © 2017 TeamAna. All rights reserved.
//

#import "PatientRegistrationController.h"

@interface PatientRegistrationController ()

@property (nonatomic, weak) IBOutlet UIButton *submitButton;

@property (nonatomic, weak) IBOutlet UITextField *firstName;
@property (nonatomic, weak) IBOutlet UITextField *lastName;
@property (nonatomic, weak) IBOutlet UITextField *phoneNumber;


@end

@implementation PatientRegistrationController

- (void)viewDidLoad {
    [super viewDidLoad];
    
    NSLog(@"PatientRegistrationController Loaded");
    // Do any additional setup after loading the view.
}

- (void)didReceiveMemoryWarning {
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}


- (IBAction)handleSubmitButtonTap:(UIButton *)button
{
    NSLog(@"Submit button tapped");
}


@end
